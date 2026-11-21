package com.adaptlearngraph.services;

import com.adaptlearngraph.repository.CertificateCatalogRepository;
import com.adaptlearngraph.entities.domain.CertificateCatalog.Definition;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.adaptlearngraph.services.CertificateCatalogService.CreateInput;
import java.util.*;
import java.io.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.web.multipart.MultipartFile;

/** Plain five-column XLSX, matching the existing catalog-import convention. */
public final class CertificateImportService {
 private static final String[] HEADERS={"Skill Code","Knowledge Level","Certificate Name","Description","Reference URL"};
 public record Row(int row,CreateInput input,String skillName,String error,Definition existing,com.adaptlearngraph.repository.CertificateAuthoringStore.Document openDraft,boolean alreadyExists) {}
 private final CertificateAuthoringService authoring;
 public CertificateImportService(CertificateAuthoringService authoring){this.authoring=authoring;}
 public byte[] template(){var data=authoring.directory();if(data.manager())throw new Failure(403,"EXPERT_REQUIRED");try(var w=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
  var header=w.createCellStyle();header.setFillForegroundColor(IndexedColors.ORANGE.getIndex());header.setFillPattern(FillPatternType.SOLID_FOREGROUND);var font=w.createFont();font.setBold(true);font.setColor(IndexedColors.WHITE.getIndex());header.setFont(font);header.setWrapText(true);
  var body=w.createCellStyle();body.setWrapText(true);body.setVerticalAlignment(VerticalAlignment.TOP);
  var cert=w.createSheet("Certificates");var row=cert.createRow(0);for(int i=0;i<HEADERS.length;i++){row.createCell(i).setCellValue(HEADERS[i]);row.getCell(i).setCellStyle(header);cert.setColumnWidth(i,(i==3?60:i==4?65:32)*256);}row.setHeightInPoints(30);cert.createFreezePane(0,1);
  var skills=w.createSheet("Skills");String[] cols={"Skill Code","Skill Name","Allowed Knowledge Levels"};skills.createRow(0);for(int i=0;i<3;i++){skills.getRow(0).createCell(i).setCellValue(cols[i]);skills.getRow(0).getCell(i).setCellStyle(header);skills.setColumnWidth(i,48*256);}int n=1;
  for(var skill:data.skills()){var r=skills.createRow(n++);String[] v={skill.skillCode(),skill.skillName(),String.join(", ",skill.levels())};for(int i=0;i<3;i++){r.createCell(i).setCellValue(v[i]);r.getCell(i).setCellStyle(body);}r.setHeightInPoints(40);}
  skills.createFreezePane(0,1);
  body.setBorderTop(BorderStyle.THIN);body.setBorderBottom(BorderStyle.THIN);body.setBorderLeft(BorderStyle.THIN);body.setBorderRight(BorderStyle.THIN);
  for(int rowNumber=1;rowNumber<=20;rowNumber++){var r=cert.createRow(rowNumber);r.setHeightInPoints(rowNumber==1?60:30);for(int c=0;c<5;c++){r.createCell(c).setCellStyle(body);}}
  String[] hints={"Enter Skill Code here / Nhập mã Skill tại đây","Foundation / Intermediate / Advanced","Enter certificate name here / Nhập tên chứng chỉ tại đây","Enter certificate description here / Nhập mô tả chứng chỉ tại đây","Enter HTTPS reference URL here / Nhập liên kết HTTPS tại đây"};
  for(int c=0;c<5;c++)cert.getRow(1).getCell(c).setCellValue(hints[c]);
  w.write(out);return out.toByteArray();
 }catch(IOException e){throw new Failure(503,"TEMPLATE_UNAVAILABLE");}}
 public List<Row> preview(MultipartFile file){
  var data=authoring.directory();if(data.manager())throw new Failure(403,"EXPERT_REQUIRED");
  if(file==null||file.isEmpty()||file.getSize()>5*1024*1024||file.getOriginalFilename()==null||!file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"))throw new Failure(400,"XLSX_MAX_5MB_REQUIRED");
  try(var stream=file.getInputStream();var w=new XSSFWorkbook(stream)){
   var sheet=w.getSheet("Certificates");if(sheet==null||sheet.getLastRowNum()>500||sheet.getRow(0)==null||sheet.getRow(0).getLastCellNum()!=5)throw new Failure(400,"CERTIFICATE_TEMPLATE_REQUIRED");
   for(int c=0;c<5;c++)if(!HEADERS[c].equals(text(sheet.getRow(0).getCell(c))))throw new Failure(400,"CERTIFICATE_HEADERS_CHANGED");
   var result=new ArrayList<Row>();
   for(int n=1;n<=sheet.getLastRowNum();n++){
    var r=sheet.getRow(n);if(r==null)continue;String[] v=new String[5];String error=null;CreateInput input=null;String name="";boolean alreadyExists=false;Definition existing=null;com.adaptlearngraph.repository.CertificateAuthoringStore.Document openDraft=null;
    try{
     for(int c=0;c<5;c++)v[c]=text(r.getCell(c));if(Arrays.stream(v).allMatch(String::isBlank))continue;
     if(r.getLastCellNum()>5)throw new IllegalArgumentException("Keep only the five template columns / Chỉ giữ năm cột của mẫu");
     var skill=data.skills().stream().filter(s->s.skillCode().equalsIgnoreCase(v[0])||s.skillId().equals(v[0])).findFirst().orElseThrow(()->new IllegalArgumentException("Unknown Certificate-mode Skill Code / Mã Skill không hợp lệ hoặc chưa có mode Certificate"));name=skill.skillName();
     String level=switch(v[1].toLowerCase(Locale.ROOT)){case "foundation","nền tảng"->"FOUNDATION";case "intermediate","trung cấp"->"INTERMEDIATE";case "advanced","nâng cao"->"ADVANCED";default->throw new IllegalArgumentException("Invalid Knowledge Level / Mức kiến thức không hợp lệ");};
     existing=data.published().stream().filter(d->d.skillId().equals(skill.skillId())&&d.knowledgeLevel().name().equals(level)).findFirst().orElse(null);
     input=new CreateInput(skill.skillId(),level,v[2],v[4],skill.version(),existing==null?null:existing.id(),v[3]);authoring.validate(input);

     openDraft=data.drafts().stream().filter(d->d.input().skillId().equals(skill.skillId())&&d.input().knowledgeLevel().equals(level)&&!d.state().equals("PUBLISHED")).findFirst().orElse(null);
     alreadyExists=openDraft!=null?same(input,openDraft.input().name(),openDraft.input().description(),openDraft.input().referenceUrl()):existing!=null&&same(input,existing.name(),existing.description(),existing.referenceUrl());
     if(!alreadyExists&&openDraft!=null&&!authoring.canEdit(openDraft))throw new IllegalArgumentException("Existing draft is under review or belongs to another Expert; keep it or wait for review / Bản hiện có đang chờ duyệt hoặc thuộc Expert khác; giữ bản này hoặc chờ xử lý");
    }catch(IllegalArgumentException|com.adaptlearngraph.exception.InitialPathwayFailure invalid){error=invalid.getMessage();}
    result.add(new Row(n+1,input,name,error,existing,openDraft,alreadyExists));
   }
   if(result.isEmpty())throw new Failure(400,"EMPTY_CERTIFICATE_IMPORT");return result;
  }catch(IOException e){throw new Failure(400,"INVALID_XLSX");}
 }
 private static String clean(String value){return value==null?"":value.strip();}
 private static boolean same(CreateInput input,String name,String description,String url){return clean(input.name()).equals(clean(name))&&clean(input.description()).equals(clean(description))&&clean(input.referenceUrl()).equals(clean(url));}
 private static String text(Cell c){if(c==null)return "";if(c.getCellType()==CellType.FORMULA)throw new IllegalArgumentException("Formulas are not supported / Không hỗ trợ công thức");return new DataFormatter(Locale.ROOT).formatCellValue(c).strip();}
}
